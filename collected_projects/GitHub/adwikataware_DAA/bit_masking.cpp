#include<iostream>
using namespace std;
int main()
{
    int n;
    cout<<"Enter number of characters/numbers\n";
    cin>>n;
    int arr[n];
    int total_subsets = 1<<n;
    
    cout<<"Enter elements \n";
    for(int j =0;j<n;j++)
    {
        cin>>arr[j];
    }
    for(int mask = 0;mask<total_subsets;mask++)
    {
        cout<<"{";
        for(int i = 0;i<n;i++)
        {
            if(mask &(1<<i))
            cout<<arr[i]<<" ";
        }
        cout<<"}\n";
    }
    return 0;
}
