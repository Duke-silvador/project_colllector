require_relative "lib/tree"

tree = Tree.new(Array.new(15) { rand(1..100) })

# tree1 = Tree.new([1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 2, 5, 7, 5, 5, 5, 2, 3, 8, 9, 8, 2, 3, 456, 586, 23, 21, 46, 687, 34,
#                   5])
# node = tree1.get_node(5)

# puts node.left_child.leaf_node?
# puts node.value

# tree1.pretty_print

# puts tree1.height(9)

tree.pretty_print

puts tree.balanced?

tree.level_order { |item| print item.to_s + " " }
puts ""
tree.preorder { |item| print item.to_s + " " }
puts ""
tree.postorder { |item| print item.to_s + " " }
puts ""
tree.inorder { |item| print item.to_s + " " }
puts ""

tree.insert(101)
tree.insert(102)
tree.insert(103)
tree.insert(104)
tree.insert(105)
tree.insert(110)
tree.insert(156)
tree.insert(108)
tree.insert(140)
tree.insert(130)
tree.insert(121)

tree.pretty_print
puts tree.balanced?

tree.rebalance

tree.pretty_print
puts tree.balanced?
